@file:Suppress("unused", "UnusedImport", "EnumEntryName", "RemoveRedundantQualifierName")

package com.gasbuddy.mobile.common.webservices.apis

import com.gasbuddy.mobile.common.interfaces.Jsonable
import com.gasbuddy.mobile.common.webservices.GBIOWebServices
import com.google.gson.annotations.SerializedName
import io.reactivex.Observable
import io.reactivex.Single
import io.reactivex.schedulers.Schedulers
import retrofit2.Call
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.http.*
import org.threeten.bp.OffsetDateTime
import okhttp3.MultipartBody
import okhttp3.ResponseBody

// @formatter:off
class FeatureAPI : GBIOWebServices() {

    //region Companion
    companion object {
        @JvmStatic
        val api: API = createAPI(baseUrl = host, clazz = API::class.java)
    }
    //endregion


    //region Web Services
    interface API {

        /**
         * Get a list of features and settings for a given device, user and app
         * @param tagName The tag (and its parents) for which features are being requested
         * @param sampleQuery A query parameter
         * @param client Information about the client making the request
         * @return Features
         */
        @Headers("Content-Type:application/json")
        @POST("/feature/features/{tag_name}")
        @JvmSuppressWildcards
        suspend fun getFeatures(
            @Path("tag_name") tagName: String,
            @Query("sample_query") sampleQuery: String? = null,
            @Body client: ClientData
        ) : Features


        /**
         * A method with no parameters
         * @return Features
         */
        @Headers("Content-Type:application/json")
        @GET("/feature/noargs")
        @JvmSuppressWildcards
        suspend fun noargsGet(
        ) : Features


    }
    //endregion


    //region Models
    open class ClientData (
        @SerializedName("locale") val locale: String? = null,  // The locale desired for returned resources 
        @SerializedName("ver") val ver: String? = null,  // The "ver" value returned from a previous call to this API which will cause features having a return_if_before value generated before ver not to be returned 
        @SerializedName("dev") val dev: ClientData.Dev, 
        @SerializedName("app") val app: ClientData.App, 
        @SerializedName("user") val user: ClientData.User? = null, 
        @SerializedName("ctx") val ctx: Map<String, Any>? = null  // Arbitrary key value pairs 
    ) : Jsonable {
    
        override fun toString() = "ClientData(locale=$locale, ver=$ver, dev=$dev, app=$app, user=$user, ctx=$ctx)"
        
        override fun hashCode(): Int {
            var result:Int = locale.hashCode()
            result = 31 * result + ver.hashCode()       
            result = 31 * result + dev.hashCode()       
            result = 31 * result + app.hashCode()       
            result = 31 * result + user.hashCode()       
            result = 31 * result + ctx.hashCode()       
            return result
        }
    
        override fun equals(other: Any?): Boolean {
            if (this === other) return true
            if (javaClass != other?.javaClass) return false
    
            other as ClientData
    
            if (locale != other.locale) return false
            if (ver != other.ver) return false
            if (dev != other.dev) return false
            if (app != other.app) return false
            if (user != other.user) return false
            if (ctx != other.ctx) return false
    
            return true
        }
    
            open class Dev (
                @SerializedName("id") val id: String? = null,  // A unique identifier for the device 
                @SerializedName("os") val os: String? = null, 
                @SerializedName("ver") val ver: String? = null 
            ) : Jsonable {
            
                override fun toString() = "Dev(id=$id, os=$os, ver=$ver)"
                
                override fun hashCode(): Int {
                    var result:Int = id.hashCode()
                    result = 31 * result + os.hashCode()       
                    result = 31 * result + ver.hashCode()       
                    return result
                }
            
                override fun equals(other: Any?): Boolean {
                    if (this === other) return true
                    if (javaClass != other?.javaClass) return false
            
                    other as Dev
            
                    if (id != other.id) return false
                    if (os != other.os) return false
                    if (ver != other.ver) return false
            
                    return true
                }
            
            
            }
    
            open class App (
                @SerializedName("id") val id: String? = null, 
                @SerializedName("ver") val ver: String? = null, 
                @SerializedName("hr") val hr: Double? = null  // Hours since app install 
            ) : Jsonable {
            
                override fun toString() = "App(id=$id, ver=$ver, hr=$hr)"
                
                override fun hashCode(): Int {
                    var result:Int = id.hashCode()
                    result = 31 * result + ver.hashCode()       
                    result = 31 * result + hr.hashCode()       
                    return result
                }
            
                override fun equals(other: Any?): Boolean {
                    if (this === other) return true
                    if (javaClass != other?.javaClass) return false
            
                    other as App
            
                    if (id != other.id) return false
                    if (ver != other.ver) return false
                    if (hr != other.hr) return false
            
                    return true
                }
            
            
            }
    
            open class User (
                @SerializedName("country") val country: String? = null,  // The country in which the user is acting or to which they are assigned 
                @SerializedName("anon_id") val anonId: String? = null  // If the user is not an authenticated user, an anonymous identifier for them (such as a guid) 
            ) : Jsonable {
            
                override fun toString() = "User(country=$country, anonId=$anonId)"
                
                override fun hashCode(): Int {
                    var result:Int = country.hashCode()
                    result = 31 * result + anonId.hashCode()       
                    return result
                }
            
                override fun equals(other: Any?): Boolean {
                    if (this === other) return true
                    if (javaClass != other?.javaClass) return false
            
                    other as User
            
                    if (country != other.country) return false
                    if (anonId != other.anonId) return false
            
                    return true
                }
            
            
            }
    
    
    }

    open class Features (
        @SerializedName("ver") val ver: String? = null,  // A version value which should be passed to future calls such that features marked with a "return_if_before" value that comes before ver will not be returned 
        @SerializedName("features") val features: List<FeaturesFeatures>? = null  // A list of feature-variant assignments for the user. Note that if the user is assigned to the "control group" for a feature, no entry will be sent for that feature 
    ) : Jsonable {
    
        override fun toString() = "Features(ver=$ver, features=$features)"
        
        override fun hashCode(): Int {
            var result:Int = ver.hashCode()
            result = 31 * result + features.hashCode()       
            return result
        }
    
        override fun equals(other: Any?): Boolean {
            if (this === other) return true
            if (javaClass != other?.javaClass) return false
    
            other as Features
    
            if (ver != other.ver) return false
            if (features != other.features) return false
    
            return true
        }
    
    
    }

    open class FeaturesFeatures (
        @SerializedName("n") val n: String,  // Feature name 
        @SerializedName("r") val r: Boolean? = null,  // FALSE if this feature should not be recorded via analytics events (e.g. we don't need to measure anymore) 
        @SerializedName("v") val v: String? = null,  // Variant for feature. If the variant and feature name are the same, only the feature name will be sent 
        @SerializedName("p") val p: Map<String, Any>? = null,  // Payload for the feature and the variant, if available 
        @SerializedName("l") val l: Map<String, Any>? = null  // Localized resources associated with the variant 
    ) : Jsonable {
    
        override fun toString() = "FeaturesFeatures(n=$n, r=$r, v=$v, p=$p, l=$l)"
        
        override fun hashCode(): Int {
            var result:Int = n.hashCode()
            result = 31 * result + r.hashCode()       
            result = 31 * result + v.hashCode()       
            result = 31 * result + p.hashCode()       
            result = 31 * result + l.hashCode()       
            return result
        }
    
        override fun equals(other: Any?): Boolean {
            if (this === other) return true
            if (javaClass != other?.javaClass) return false
    
            other as FeaturesFeatures
    
            if (n != other.n) return false
            if (r != other.r) return false
            if (v != other.v) return false
            if (p != other.p) return false
            if (l != other.l) return false
    
            return true
        }
    
    
    }

    //endregion

    //region Enums
    //endregion
    
}
